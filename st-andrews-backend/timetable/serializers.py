from rest_framework import serializers
from .clashes import describe, find_clashes
from .models import TimetableSlot

class TimetableSlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimetableSlot
        fields = '__all__'

    def validate(self, attrs):
        """Reject a slot that would double-book a teacher, room or class."""
        def pick(name):
            if name in attrs:
                return attrs[name]
            return getattr(self.instance, name, '') if self.instance else ''

        clashes = find_clashes(
            day=pick('day'), period=pick('period'),
            teacher_name=pick('teacher_name'), room=pick('room'),
            grade=pick('grade'), section=pick('section'),
            exclude_id=self.instance.pk if self.instance else None,
        )
        if clashes:
            raise serializers.ValidationError([describe(c) for c in clashes])
        return attrs


class ClashCheckSerializer(serializers.Serializer):
    """Input for the live clash check. `id` is the slot being edited, if any."""
    id = serializers.IntegerField(required=False, allow_null=True)
    day = serializers.ChoiceField(choices=[d for d, _ in TimetableSlot._meta.get_field('day').choices])
    period = serializers.IntegerField(min_value=1)
    teacher_name = serializers.CharField(required=False, allow_blank=True, default='')
    room = serializers.CharField(required=False, allow_blank=True, default='')
    grade = serializers.CharField(required=False, allow_blank=True, default='')
    section = serializers.CharField(required=False, allow_blank=True, default='')
